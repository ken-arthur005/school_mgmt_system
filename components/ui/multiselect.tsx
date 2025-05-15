import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

type Option = {
  id: string;
  name: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = "Select subjects",
}) => {
  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((val) => val !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Listbox as="div" value={selected} onChange={onChange} multiple>
      <div className="relative">
        <Listbox.Button className="w-full flex justify-between items-center border rounded-md px-3 py-2 text-sm shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary">
          <span>
            {selected.length > 0
              ? options
                  .filter((o) => selected.includes(o.id))
                  .map((o) => o.name)
                  .join(", ")
              : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.id}
                value={option.id}
                className={({ active }) =>
                  clsx(
                    "relative cursor-pointer select-none py-2 pl-10 pr-4",
                    active ? "bg-primary text-white" : "text-gray-900"
                  )
                }
              >
                {({ selected: isSelected }) => (
                  <>
                    <span
                      className={clsx(
                        "block truncate",
                        isSelected ? "font-medium" : "font-normal"
                      )}
                    >
                      {option.name}
                    </span>
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};
